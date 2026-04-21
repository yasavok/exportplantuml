// PlantUML Diagram Generator
const plantumlCode = document.getElementById('plantuml-code');
const renderBtn = document.getElementById('render-btn');
const exportBtn = document.getElementById('export-btn');
const diagramPreview = document.getElementById('diagram-preview');

let currentDiagramUrl = null;

// Функция для генерации диаграммы через PlantUML сервер
function generateDiagram() {
    const code = plantumlCode.value.trim();
    
    if (!code) {
        alert('Пожалуйста, введите PlantUML код');
        return;
    }
    
    diagramPreview.innerHTML = '<p class="loading">Генерация диаграммы...</p>';
    
    try {
        // Используем публичный PlantUML сервер с правильной кодировкой
        const encoded = encodep(code);
        
        // URL для получения PNG изображения
        currentDiagramUrl = `https://www.plantuml.com/plantuml/png/${encoded}`;
        
        console.log('Generated URL:', currentDiagramUrl);
        
        const img = document.createElement('img');
        img.src = currentDiagramUrl;
        img.alt = 'PlantUML Diagram';
        
        img.onload = () => {
            diagramPreview.innerHTML = '';
            diagramPreview.appendChild(img);
            exportBtn.disabled = false;
        };
        
        img.onerror = (e) => {
            console.error('Image load error:', e);
            console.error('URL:', currentDiagramUrl);
            diagramPreview.innerHTML = '<p style="color: #ff0000;">Ошибка при генерации диаграммы. Проверьте синтаксис PlantUML кода.</p>';
            exportBtn.disabled = true;
        };
    } catch (error) {
        console.error('Encoding error:', error);
        diagramPreview.innerHTML = '<p style="color: #ff0000;">Ошибка кодирования: ' + error.message + '</p>';
        exportBtn.disabled = true;
    }
}

// Функция для экспорта диаграммы
async function exportDiagram() {
    if (!currentDiagramUrl) {
        alert('Сначала создайте диаграмму');
        return;
    }
    
    try {
        // Генерируем XMI файл для Umbrello
        const xmiContent = convertPlantUMLToXMI(plantumlCode.value);
        const xmiBlob = new Blob([xmiContent], { type: 'application/xml' });
        const xmiUrl = window.URL.createObjectURL(xmiBlob);
        const xmiLink = document.createElement('a');
        xmiLink.href = xmiUrl;
        xmiLink.download = 'diagram.xmi';
        document.body.appendChild(xmiLink);
        xmiLink.click();
        document.body.removeChild(xmiLink);
        window.URL.revokeObjectURL(xmiUrl);
        
        alert('Диаграмма экспортирована в формате XMI для Umbrello!');
    } catch (error) {
        alert('Ошибка при экспорте: ' + error.message);
    }
}

// Функция для конвертации PlantUML в XMI формат для Umbrello
function convertPlantUMLToXMI(plantumlCode) {
    // Определяем тип диаграммы
    const isUseCase = plantumlCode.includes('actor') || plantumlCode.includes('usecase');
    
    if (isUseCase) {
        return convertUseCaseToXMI(plantumlCode);
    } else {
        return convertClassDiagramToXMI(plantumlCode);
    }
}

// Функция для конвертации Use Case диаграммы
function convertUseCaseToXMI(plantumlCode) {
    const actors = [];
    const usecases = [];
    const relationships = [];
    
    const lines = plantumlCode.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex].trim();
        
        // Парсим актеров
        if (line.startsWith('actor ')) {
            const match = line.match(/actor\s+"([^"]+)"\s+as\s+(\w+)|actor\s+(\w+)/);
            if (match) {
                const actorName = match[1] || match[3];
                const actorId = match[2] || match[3];
                actors.push({
                    id: generateId(),
                    name: actorName,
                    alias: actorId
                });
                console.log('Parsed actor:', actorName);
            }
        }
        
        // Парсим прецеденты
        if (line.startsWith('usecase ')) {
            const match = line.match(/usecase\s+"([^"]+)"\s+as\s+(\w+)|usecase\s+(\w+)/);
            if (match) {
                const usecaseName = match[1] || match[3];
                const usecaseId = match[2] || match[3];
                usecases.push({
                    id: generateId(),
                    name: usecaseName,
                    alias: usecaseId
                });
                console.log('Parsed usecase:', usecaseName);
            }
        }
        
        // Парсим связи
        if (line.includes('-->') || line.includes('<--') || line.includes('<|--') || line.includes('--|>') || line.includes('..>') || line.includes('<|..')) {
            // Убираем стереотипы типа <<include>>, <<extend>>
            let cleanLine = line.replace(/<<[^>]+>>/g, '').trim();
            
            const parts = cleanLine.split(/-->|<--|<\|--|--\|>|\.\.\>|<\|\.\./);
            if (parts.length >= 2) {
                let from = parts[0].trim();
                let to = parts[1].split(':')[0].trim();
                
                // Убираем кавычки если есть
                from = from.replace(/"/g, '');
                to = to.replace(/"/g, '');
                
                let relType = 'association';
                if (line.includes('<|--') || line.includes('--|>')) {
                    relType = 'generalization';
                } else if (line.includes('..>') || line.includes('<|..')) {
                    relType = 'dependency';
                }
                
                relationships.push({
                    id: generateId(),
                    from: from,
                    to: to,
                    type: relType
                });
                console.log('Parsed relationship:', from, '->', to, 'type:', relType);
            }
        }
    }
    
    console.log('Total actors:', actors.length);
    console.log('Total usecases:', usecases.length);
    console.log('Total relationships:', relationships.length);
    
    // Генерируем XMI для Use Case диаграммы
    const undefTypeId = 'uopsmsGJK2i08';
    const useCaseViewId = 'Use_Case_View';
    const datatypesId = 'Datatypes';
    const logicalViewId = 'Logical_View';
    
    let xmi = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <xmi:Documentation exporter="umbrello uml modeller 2.0" exporterVersion="2.0.4"/>
  <uml:Model xmi:id="m1" name="UML Model">
    <packagedElement xmi:type="uml:Stereotype" xmi:id="folder" name="folder"/>
    <packagedElement xmi:type="uml:Stereotype" xmi:id="dataType" name="dataType"/>
    <packagedElement xmi:type="uml:Model" xmi:id="${logicalViewId}" name="Logical View" stereotype="folder">
      <uml:Package xmi:id="${datatypesId}" name="Datatypes" stereotype="folder">
        <packagedElement xmi:type="uml:DataType" xmi:id="${undefTypeId}" name="undef" stereotype="dataType"/>
      </uml:Package>
    </packagedElement>
    <packagedElement xmi:type="uml:Model" xmi:id="${useCaseViewId}" name="Use Case View" stereotype="folder">
`;

    // Добавляем актеров
    actors.forEach(actor => {
        xmi += `      <packagedElement xmi:type="uml:Actor" xmi:id="${actor.id}" name="${actor.name}"/>
`;
    });
    
    // Добавляем прецеденты
    usecases.forEach(usecase => {
        xmi += `      <packagedElement xmi:type="uml:UseCase" xmi:id="${usecase.id}" name="${usecase.name}"/>
`;
    });
    
    // Добавляем связи
    relationships.forEach(rel => {
        const fromActor = actors.find(a => a.alias === rel.from);
        const toActor = actors.find(a => a.alias === rel.to);
        const fromUseCase = usecases.find(u => u.alias === rel.from);
        const toUseCase = usecases.find(u => u.alias === rel.to);
        
        const fromId = fromActor?.id || fromUseCase?.id;
        const toId = toActor?.id || toUseCase?.id;
        
        if (fromId && toId) {
            if (rel.type === 'generalization') {
                xmi += `      <packagedElement xmi:type="uml:Generalization" xmi:id="${rel.id}" general="${toId}" specific="${fromId}"/>
`;
            } else if (rel.type === 'dependency') {
                xmi += `      <packagedElement xmi:type="uml:Dependency" xmi:id="${rel.id}" name="" client="${fromId}" supplier="${toId}"/>
`;
            } else {
                xmi += `      <packagedElement xmi:type="uml:Association" xmi:id="${rel.id}" name="">
        <ownedEnd xmi:type="uml:AssociationEnd" xmi:id="${generateId()}" name="" type="${fromId}" aggregation="none" isNavigable="true" changeability="changeable"/>
        <ownedEnd xmi:type="uml:AssociationEnd" xmi:id="${generateId()}" name="" type="${toId}" aggregation="none" isNavigable="true" changeability="changeable"/>
      </packagedElement>
`;
            }
        }
    });
    
    xmi += `      <xmi:Extension extender="umbrello">
        <diagrams>
          <diagram xmi.id="u${generateId()}" name="use case diagram" type="2" documentation="" backgroundcolor="#ffffff" usebackgroundcolor="0" fillcolor="#ffffc0" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" griddotcolor="#d3d3d3" linecolor="#990000" linewidth="0" textcolor="#000000" usefillcolor="1" usealignmentguides="1" showattribassocs="1" showatts="1" showattsig="1" showops="1" showopsig="1" showpackage="1" showpubliconly="0" showscope="1" showdocumentation="0" showstereotype="2" localid="-1" showgrid="0" snapgrid="0" snapcsgrid="0" snapx="25" snapy="25" zoom="100" canvasheight="800" canvaswidth="1100" isopen="1">
            <widgets>
`;
    
    // Добавляем виджеты актеров
    let xPos = 50;
    let yPos = 100;
    actors.forEach(actor => {
        xmi += `              <actorwidget xmi.id="${actor.id}" localid="u${generateId()}" textcolor="#000000" linecolor="#990000" linewidth="0" usefillcolor="1" usesdiagramfillcolor="0" usesdiagramusefillcolor="0" fillcolor="#ffffc0" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" autoresize="1" x="${xPos}" y="${yPos}" width="80" height="80" isinstance="0" showstereotype="2"/>
`;
        yPos += 150;
    });
    
    // Добавляем виджеты прецедентов
    xPos = 400;
    yPos = 100;
    usecases.forEach(usecase => {
        xmi += `              <usecasewidget xmi.id="${usecase.id}" localid="u${generateId()}" textcolor="#000000" linecolor="#990000" linewidth="0" usefillcolor="1" usesdiagramfillcolor="0" usesdiagramusefillcolor="0" fillcolor="#ffffc0" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" autoresize="1" x="${xPos}" y="${yPos}" width="120" height="60" isinstance="0" showstereotype="2"/>
`;
        yPos += 100;
        if (yPos > 700) {
            yPos = 100;
            xPos += 250;
        }
    });
    
    xmi += `            </widgets>
            <messages/>
            <associations>
`;
    
    // Добавляем связи на диаграмму
    relationships.forEach(rel => {
        const fromActor = actors.find(a => a.alias === rel.from || a.name === rel.from);
        const toActor = actors.find(a => a.alias === rel.to || a.name === rel.to);
        const fromUseCase = usecases.find(u => u.alias === rel.from || u.name === rel.from);
        const toUseCase = usecases.find(u => u.alias === rel.to || u.name === rel.to);
        
        const fromId = fromActor?.id || fromUseCase?.id;
        const toId = toActor?.id || toUseCase?.id;
        
        if (fromId && toId) {
            console.log('Creating association:', rel.from, '->', rel.to, 'fromId:', fromId, 'toId:', toId);
            
            // Типы связей для Use Case диаграмм в Umbrello:
            // 500 = Association (обычная связь)
            // 502 = Dependency (зависимость, include/extend)
            // 503 = Generalization (обобщение, наследование)
            // 515 = Directional Association (направленная ассоциация)
            
            let assocType = '515'; // directional association (по умолчанию для actor->usecase)
            if (rel.type === 'generalization') {
                assocType = '503'; // generalization
            } else if (rel.type === 'dependency') {
                assocType = '502'; // dependency (include/extend)
            } else if (fromActor && toUseCase) {
                assocType = '515'; // directional association (actor to usecase)
            } else if (fromUseCase && toActor) {
                assocType = '515'; // directional association (usecase to actor)
            } else {
                assocType = '500'; // simple association
            }
            
            xmi += `              <assocwidget xmi.id="${rel.id}" localid="u${generateId()}" textcolor="none" linecolor="#990000" linewidth="0" usefillcolor="1" usesdiagramfillcolor="1" usesdiagramusefillcolor="1" fillcolor="none" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" autoresize="1" seqnum="" type="${assocType}" widgetaid="${fromId}" widgetbid="${toId}" indexa="0" totalcounta="0" indexb="0" totalcountb="0"/>
`;
        } else {
            console.warn('Could not find elements for relationship:', rel.from, '->', rel.to);
        }
    });
    
    xmi += `            </associations>
          </diagram>
        </diagrams>
      </xmi:Extension>
    </packagedElement>
    <packagedElement xmi:type="uml:Model" xmi:id="Component_View" name="Component View" stereotype="folder"/>
    <packagedElement xmi:type="uml:Model" xmi:id="Deployment_View" name="Deployment View" stereotype="folder"/>
    <packagedElement xmi:type="uml:Model" xmi:id="Entity_Relationship_Model" name="Entity Relationship Model" stereotype="folder"/>
  </uml:Model>
  <xmi:Extension extender="umbrello">
    <docsettings viewid="${useCaseViewId}" documentation="" uniqueid="u${generateId()}"/>
    <listview>
      <listitem id="Views" type="800" open="1">
        <listitem id="Component_View" type="821" open="1"/>
        <listitem id="Deployment_View" type="827" open="1"/>
        <listitem id="Entity_Relationship_Model" type="836" open="1"/>
        <listitem id="${logicalViewId}" type="801" open="1">
          <listitem id="${datatypesId}" type="830" open="0">
            <listitem id="${undefTypeId}" type="829" open="0"/>
          </listitem>
        </listitem>
        <listitem id="${useCaseViewId}" type="802" open="1">
`;

    // Добавляем актеров в listview
    actors.forEach(actor => {
        xmi += `          <listitem id="${actor.id}" type="811" open="1"/>
`;
    });
    
    // Добавляем прецеденты в listview
    usecases.forEach(usecase => {
        xmi += `          <listitem id="${usecase.id}" type="812" open="1"/>
`;
    });

    xmi += `        </listitem>
      </listitem>
    </listview>
  </xmi:Extension>
</xmi:XMI>`;
    
    console.log('Generated Use Case XMI length:', xmi.length);
    
    return xmi;
}

// Функция для конвертации Class диаграммы
function convertClassDiagramToXMI(plantumlCode) {
    // Парсим PlantUML код для извлечения классов и связей
    const classes = [];
    const relationships = [];
    
    const lines = plantumlCode.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex].trim();
        
        // Парсим классы
        if (line.startsWith('class ')) {
            const className = line.match(/class\s+(\w+)/)?.[1];
            if (className) {
                const classId = generateId();
                const attributes = [];
                const operations = [];
                
                // Ищем атрибуты и методы в следующих строках
                let i = lineIndex + 1;
                while (i < lines.length && !lines[i].includes('}')) {
                    const member = lines[i].trim();
                    if (member && member !== '{') {
                        if (member.includes('()')) {
                            // Это метод
                            const methodName = member.replace(/[+\-#~]/g, '').replace(/\(\).*/, '').trim();
                            operations.push({
                                id: generateId(),
                                name: methodName
                            });
                        } else {
                            // Это атрибут
                            const parts = member.replace(/[+\-#~]/g, '').split(/\s+/);
                            const attrName = parts[1] || parts[0] || 'attribute';
                            attributes.push({
                                id: generateId(),
                                name: attrName
                            });
                        }
                    }
                    i++;
                }
                
                classes.push({
                    id: classId,
                    name: className,
                    attributes: attributes,
                    operations: operations
                });
                
                console.log('Parsed class:', className, 'with', attributes.length, 'attributes and', operations.length, 'operations');
            }
        }
        
        // Парсим связи
        if (line.includes('-->') || line.includes('--') || line.includes('<|--') || line.includes('*--')) {
            const parts = line.split(/-->|<\|--|--|\*--/);
            if (parts.length >= 2) {
                const fromClass = parts[0].trim();
                const toClass = parts[1].split(':')[0].trim();
                const label = parts[1].includes(':') ? parts[1].split(':')[1].trim() : '';
                
                relationships.push({
                    id: generateId(),
                    from: fromClass,
                    to: toClass,
                    label: label,
                    type: line.includes('<|--') ? 'generalization' : line.includes('*--') ? 'composition' : 'association'
                });
                
                console.log('Parsed relationship:', fromClass, '->', toClass, 'label:', label);
            }
        }
    }
    
    console.log('Total classes:', classes.length);
    console.log('Total relationships:', relationships.length);
    
    // Генерируем XMI точно как в рабочем примере
    const undefTypeId = 'uopsmsGJK2i08';
    const logicalViewId = 'Logical_View';
    const datatypesId = 'Datatypes';
    
    let xmi = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <xmi:Documentation exporter="umbrello uml modeller 2.0" exporterVersion="2.0.4"/>
  <uml:Model xmi:id="m1" name="UML Model">
    <packagedElement xmi:type="uml:Stereotype" xmi:id="folder" name="folder"/>
    <packagedElement xmi:type="uml:Stereotype" xmi:id="dataType" name="dataType"/>
    <packagedElement xmi:type="uml:Model" xmi:id="${logicalViewId}" name="Logical View" stereotype="folder">
      <uml:Package xmi:id="${datatypesId}" name="Datatypes" stereotype="folder">
        <packagedElement xmi:type="uml:DataType" xmi:id="${undefTypeId}" name="undef" stereotype="dataType"/>
      </uml:Package>
`;

    // Добавляем классы
    classes.forEach(cls => {
        xmi += `      <packagedElement xmi:type="uml:Class" xmi:id="${cls.id}" name="${cls.name}">
`;
        
        // Добавляем атрибуты
        cls.attributes.forEach(attr => {
            xmi += `        <ownedAttribute xmi:type="uml:Property" xmi:id="${attr.id}" name="${attr.name}" type="${undefTypeId}"/>
`;
        });
        
        // Добавляем операции
        cls.operations.forEach(op => {
            xmi += `        <ownedOperation xmi:type="uml:Operation" xmi:id="${op.id}" name="${op.name}"/>
`;
        });
        
        xmi += `      </packagedElement>
`;
    });
    
    // Добавляем связи
    relationships.forEach(rel => {
        const fromClass = classes.find(c => c.name === rel.from);
        const toClass = classes.find(c => c.name === rel.to);
        
        if (fromClass && toClass) {
            if (rel.type === 'generalization') {
                xmi += `      <packagedElement xmi:type="uml:Generalization" xmi:id="${rel.id}" general="${toClass.id}" specific="${fromClass.id}"/>
`;
            } else {
                const aggregationType = rel.type === 'composition' ? 'composite' : 'none';
                xmi += `      <packagedElement xmi:type="uml:Association" xmi:id="${rel.id}" name="${rel.label}">
        <ownedEnd xmi:type="uml:AssociationEnd" xmi:id="${generateId()}" name="" type="${fromClass.id}" aggregation="none" isNavigable="true" changeability="changeable"/>
        <ownedEnd xmi:type="uml:AssociationEnd" xmi:id="${generateId()}" name="" type="${toClass.id}" aggregation="${aggregationType}" isNavigable="true" changeability="changeable"/>
      </packagedElement>
`;
            }
        }
    });
    
    xmi += `      <xmi:Extension extender="umbrello">
        <diagrams>
          <diagram xmi.id="u${generateId()}" name="class diagram" type="1" documentation="" backgroundcolor="#ffffff" usebackgroundcolor="0" fillcolor="#ffffc0" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" griddotcolor="#d3d3d3" linecolor="#990000" linewidth="0" textcolor="#000000" usefillcolor="1" usealignmentguides="1" showattribassocs="1" showatts="1" showattsig="1" showops="1" showopsig="1" showpackage="1" showpubliconly="0" showscope="1" showdocumentation="0" showstereotype="2" localid="-1" showgrid="0" snapgrid="0" snapcsgrid="0" snapx="25" snapy="25" zoom="100" canvasheight="800" canvaswidth="1100" isopen="0">
            <widgets>
`;
    
    // Добавляем виджеты классов на диаграмму
    let xPos = 100;
    let yPos = 100;
    classes.forEach(cls => {
        xmi += `              <classwidget xmi.id="${cls.id}" localid="u${generateId()}" textcolor="#000000" linecolor="#990000" linewidth="0" usefillcolor="1" usesdiagramfillcolor="0" usesdiagramusefillcolor="0" fillcolor="#ffffc0" font="Segoe UI,9,-1,5,400,0,0,0,0,0,0,0,0,0,0,1" autoresize="1" x="${xPos}" y="${yPos}" width="120" height="80" isinstance="0" showstereotype="2" showattributes="1" showoperations="1" showpubliconly="0" showattsigs="1" showopsigs="1" showpackage="1" showscope="1" showattribassocs="1"/>
`;
        xPos += 200;
        if (xPos > 800) {
            xPos = 100;
            yPos += 150;
        }
    });
    
    xmi += `            </widgets>
            <messages/>
            <associations/>
          </diagram>
        </diagrams>
      </xmi:Extension>
    </packagedElement>
    <packagedElement xmi:type="uml:Model" xmi:id="Use_Case_View" name="Use Case View" stereotype="folder">
      <xmi:Extension extender="umbrello">
        <diagrams/>
      </xmi:Extension>
    </packagedElement>
    <packagedElement xmi:type="uml:Model" xmi:id="Component_View" name="Component View" stereotype="folder"/>
    <packagedElement xmi:type="uml:Model" xmi:id="Deployment_View" name="Deployment View" stereotype="folder"/>
    <packagedElement xmi:type="uml:Model" xmi:id="Entity_Relationship_Model" name="Entity Relationship Model" stereotype="folder"/>
  </uml:Model>
  <xmi:Extension extender="umbrello">
    <docsettings viewid="${logicalViewId}" documentation="" uniqueid="u${generateId()}"/>
    <listview>
      <listitem id="Views" type="800" open="1">
        <listitem id="Component_View" type="821" open="1"/>
        <listitem id="Deployment_View" type="827" open="1"/>
        <listitem id="Entity_Relationship_Model" type="836" open="1"/>
        <listitem id="${logicalViewId}" type="801" open="1">
          <listitem id="${datatypesId}" type="830" open="0">
            <listitem id="${undefTypeId}" type="829" open="0"/>
          </listitem>
`;

    // Добавляем классы в listview
    classes.forEach(cls => {
        xmi += `          <listitem id="${cls.id}" type="813" open="0">
`;
        cls.operations.forEach(op => {
            xmi += `            <listitem id="${op.id}" type="815" open="0"/>
`;
        });
        cls.attributes.forEach(attr => {
            xmi += `            <listitem id="${attr.id}" type="814" open="0"/>
`;
        });
        xmi += `          </listitem>
`;
    });

    xmi += `        </listitem>
        <listitem id="Use_Case_View" type="802" open="1"/>
      </listitem>
    </listview>
  </xmi:Extension>
</xmi:XMI>`;
    
    console.log('Generated XMI length:', xmi.length);
    
    return xmi;
}

// Вспомогательные функции
function generateId() {
    return 'id' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getVisibility(member) {
    if (member.startsWith('+')) return 'public';
    if (member.startsWith('-')) return 'private';
    if (member.startsWith('#')) return 'protected';
    if (member.startsWith('~')) return 'package';
    return 'public';
}

// PlantUML encoding function (правильная реализация с pako)
function encodep(text) {
    try {
        const data = new TextEncoder().encode(text);
        const compressed = pako.deflateRaw(data);
        return encode64(compressed);
    } catch (error) {
        console.error('Pako error:', error);
        throw error;
    }
}

function encode64(data) {
    let r = '';
    for (let i = 0; i < data.length; i += 3) {
        if (i + 2 == data.length) {
            r += append3bytes(data[i], data[i + 1], 0);
        } else if (i + 1 == data.length) {
            r += append3bytes(data[i], 0, 0);
        } else {
            r += append3bytes(data[i], data[i + 1], data[i + 2]);
        }
    }
    return r;
}

function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    let r = '';
    r += encode6bit(c1 & 0x3F);
    r += encode6bit(c2 & 0x3F);
    r += encode6bit(c3 & 0x3F);
    r += encode6bit(c4 & 0x3F);
    return r;
}

function encode6bit(b) {
    if (b < 10) return String.fromCharCode(48 + b);
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b);
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b);
    b -= 26;
    if (b == 0) return '-';
    if (b == 1) return '_';
    return '?';
}

// Event listeners
renderBtn.addEventListener('click', generateDiagram);
exportBtn.addEventListener('click', exportDiagram);

// Disable export button initially
exportBtn.disabled = true;

// Автоматическая генерация при загрузке страницы
window.addEventListener('load', () => {
    generateDiagram();
});
